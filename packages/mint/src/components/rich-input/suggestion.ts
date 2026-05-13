import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions } from '@tiptap/suggestion';
import type { RefObject } from 'react';
import type { MentionType } from '@/types';
import { SuggestionPopup, type SuggestionItem, type SuggestionPopupRef } from './suggestion-popup';

const API_ENDPOINTS: Record<MentionType, string> = {
  file: '/api/files/search',
  skill: '/api/skills/search',
  mcp: '/api/tools/mcp/search',
};

/**
 * Position a popup element near the editor caret using fixed positioning.
 * Works without tippy.js or floating-ui.
 */
function positionPopup(el: HTMLElement, clientRect: (() => DOMRect | null) | null | undefined) {
  const rect = clientRect?.();
  if (!rect) return;
  el.style.position = 'fixed';
  el.style.bottom = `${window.innerHeight - rect.top + 4}px`;
  el.style.left = `${Math.max(8, rect.left - 20)}px`;
}

export function createSuggestionConfig(
  mentionType: MentionType,
  projectIdRef?: RefObject<string | null | undefined>,
  onPopupStateChange?: (open: boolean) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Partial<SuggestionOptions<SuggestionItem, any>> {
  return {
    char: mentionType === 'file' ? '@' : mentionType === 'skill' ? '/' : '#',
    allowedPrefixes: [' ', '(', '{', '"', "'"],

    items: async ({ query }) => {
      try {
        const endpoint = API_ENDPOINTS[mentionType];
        const q = query || '*';
        const params = new URLSearchParams({ q });
        // Dynamic read from ref — always gets latest projectId
        const currentProjectId = projectIdRef?.current;
        if (currentProjectId) params.append('projectId', currentProjectId);
        const res = await fetch(`${endpoint}?${params.toString()}`);
        if (!res.ok) return [];
        const data = await res.json();
        if (mentionType === 'file') {
          const raw = data.results ?? [];
          return raw.map((r: { name: string; path: string; type: string }) => ({
            type: 'file' as const,
            label: r.name,
            value: r.path,
            description: r.type === 'directory' ? 'Directory' : undefined,
          }));
        }
        return data.results ?? [];
      } catch {
        return [];
      }
    },

    render: () => {
      let component: ReactRenderer<SuggestionPopupRef> | null = null;
      let popupContainer: HTMLDivElement | null = null;

      const mount = () => {
        if (!popupContainer) {
          popupContainer = document.createElement('div');
          popupContainer.style.zIndex = '9999';
          document.body.appendChild(popupContainer);
        }
      };

      const unmount = () => {
        if (popupContainer) {
          popupContainer.remove();
          popupContainer = null;
        }
        if (component) {
          component.destroy();
          component = null;
        }
        onPopupStateChange?.(false);
      };

      return {
        onStart(props) {
          mount();
          onPopupStateChange?.(true);

          component = new ReactRenderer(SuggestionPopup, {
            props: {
              items: props.items,
              command: (item: { id: string; label: string }) => {
                props.command(item);
                unmount();
              },
              type: mentionType,
            },
            editor: props.editor,
          });

          if (popupContainer && component.element) {
            popupContainer.appendChild(component.element);
            positionPopup(popupContainer, props.clientRect);
          }
        },

        onUpdate(props) {
          component?.updateProps({
            items: props.items,
            command: (item: { id: string; label: string }) => {
              props.command(item);
              unmount();
            },
            type: mentionType,
          });

          if (popupContainer) {
            positionPopup(popupContainer, props.clientRect);
          }
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            unmount();
            return true;
          }
          if (props.event.key === 'Enter') {
            const handled = component?.ref?.onKeyDown(props.event) ?? false;
            if (handled) {
              unmount();
            }
            return handled;
          }
          return component?.ref?.onKeyDown(props.event) ?? false;
        },

        onExit() {
          unmount();
        },
      };
    },
  };
}
