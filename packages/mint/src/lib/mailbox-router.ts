import type { MailboxMessage } from '@/types';
import { appendMailboxMessage, loadTeam } from '@/lib/storage/team';
import { createLogger } from '@/lib/logger';

const log = createLogger('mailbox-router');

/**
 * Route a message through the centralized mailbox.
 * If toAgentId is '*', broadcast to all agents except sender.
 * Otherwise, deliver to the specific agent.
 */
export async function routeMessage(
  teamId: string,
  message: Omit<MailboxMessage, 'id' | 'timestamp'>,
): Promise<MailboxMessage> {
  const mailboxMessage: MailboxMessage = {
    id: `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    fromAgentId: message.fromAgentId,
    toAgentId: message.toAgentId,
    content: message.content,
    timestamp: Date.now(),
    type: message.type,
  };

  // Persist message
  await appendMailboxMessage(teamId, mailboxMessage);

  if (message.toAgentId === '*') {
    log.info('Broadcast message routed', {
      teamId,
      fromAgentId: message.fromAgentId,
      type: message.type,
    });
  } else {
    log.info('Direct message routed', {
      teamId,
      fromAgentId: message.fromAgentId,
      toAgentId: message.toAgentId,
      type: message.type,
    });
  }

  return mailboxMessage;
}

/**
 * Get messages for a team, optionally filtered by agent.
 * An agent can see:
 * - Messages sent directly to them (toAgentId === agentId)
 * - Broadcast messages (toAgentId === '*') not from themselves
 * - Messages they sent themselves
 * If no agentId provided, return all messages for the team.
 */
export async function getMessages(
  teamId: string,
  agentId?: string,
): Promise<MailboxMessage[]> {
  const team = await loadTeam(teamId);
  if (!team) {
    return [];
  }

  if (!agentId) {
    return team.mailbox;
  }

  return team.mailbox.filter(
    (msg) =>
      msg.fromAgentId === agentId ||
      msg.toAgentId === agentId ||
      msg.toAgentId === '*',
  );
}
