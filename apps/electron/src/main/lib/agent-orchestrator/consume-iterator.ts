import { createLogger } from '../logger';
import { areAllWorkersIdle } from '../team-inbox-reader';
import { SessionStreamState, processSDKMessage } from '../agent-stream';
import type { AgentAdapter } from '../agent-adapter';

const log = createLogger('lib.agent-orchestrator.consume-iterator');

/** Create a timer Promise that can be aborted. */
function timerWithAbort(ms: number, signal: AbortSignal): Promise<'timeout' | 'aborted'> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve('aborted');
      return;
    }
    const timer = setTimeout(() => resolve('timeout'), ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve('aborted');
      },
      { once: true },
    );
  });
}

/** Shared iterator consumption with watchdog and global timeout. */
export async function consumeSDKIterator(
  result: AsyncIterable<any>,
  state: SessionStreamState,
  enqueue: (data: Uint8Array) => boolean,
  timeoutSignal: AbortSignal,
): Promise<void> {
  const loopAbort = new AbortController();

  // Propagate global timeout to loop abort
  if (timeoutSignal.aborted) {
    loopAbort.abort();
  } else {
    timeoutSignal.addEventListener(
      'abort',
      () => {
        log.warn('Global timeout propagated to SDK iterator');
        loopAbort.abort();
      },
      { once: true },
    );
  }

  // Watchdog: every 5s check if all workers are idle
  const watchdogDone = (async () => {
    while (!loopAbort.signal.aborted) {
      const status = await timerWithAbort(5000, loopAbort.signal);
      if (status === 'aborted') break;
      if (state.startedTaskIds.size > 0 && state.capturedSdkSessionId) {
        const allIdle = areAllWorkersIdle(state.capturedSdkSessionId, state.startedTaskIds.size);
        if (allIdle) {
          log.info('Watchdog: all workers idle, aborting main loop');
          loopAbort.abort();
        }
      }
    }
  })();

  const abortPromise = new Promise<'aborted'>((resolve) => {
    if (loopAbort.signal.aborted) {
      resolve('aborted');
      return;
    }
    loopAbort.signal.addEventListener('abort', () => resolve('aborted'), { once: true });
  });

  const iterator = result[Symbol.asyncIterator]();
  let lastMessageTime = Date.now();
  const getStallMs = () => (state.startedTaskIds.size > 0 ? 120_000 : 30_000);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const stallPromise = new Promise<'stalled'>((resolve) => {
      const check = () => {
        if (loopAbort.signal.aborted) return;
        const elapsed = Date.now() - lastMessageTime;
        if (elapsed > getStallMs()) {
          resolve('stalled');
          return;
        }
        setTimeout(check, 5000);
      };
      setTimeout(check, 5000);
    });

    const raceResult = await Promise.race([iterator.next(), abortPromise, stallPromise]);
    if (raceResult === 'aborted' || raceResult === 'stalled') {
      if (raceResult === 'stalled') {
        log.warn('SDK iterator stalled for 30s, aborting to trigger auto-resume');
      }
      break;
    }
    if ((raceResult as IteratorResult<any>).done) break;
    processSDKMessage((raceResult as IteratorResult<any>).value, state, enqueue);
    lastMessageTime = Date.now();
  }

  loopAbort.abort();
  await watchdogDone;
}

/** Iterate SDK messages with watchdog and global timeout. */
export async function iterateSDKMessages(
  adapter: AgentAdapter,
  prompt: string,
  queryOptions: Parameters<typeof import('@anthropic-ai/claude-agent-sdk').query>[0]['options'],
  state: SessionStreamState,
  enqueue: (data: Uint8Array) => boolean,
  timeoutSignal: AbortSignal,
): Promise<void> {
  const result = adapter.executeQuery(prompt, queryOptions);
  await consumeSDKIterator(result, state, enqueue, timeoutSignal);
}

/** Iterate SDK messages using resume (for retry when session already started). */
export async function iterateSDKMessagesResume(
  adapter: AgentAdapter,
  prompt: string,
  sdkSessionId: string,
  queryOptions: Parameters<typeof import('@anthropic-ai/claude-agent-sdk').query>[0]['options'],
  state: SessionStreamState,
  enqueue: (data: Uint8Array) => boolean,
  timeoutSignal: AbortSignal,
): Promise<void> {
  const resumePrompt =
    'The previous connection was interrupted. Please continue from where you left off.';
  const result = adapter.resumeQuery(resumePrompt, sdkSessionId, queryOptions);
  await consumeSDKIterator(result, state, enqueue, timeoutSignal);
}
