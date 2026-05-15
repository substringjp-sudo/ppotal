import { Document } from '@tiptap/extension-document';
import { Extension, getDebugJSON } from '@tiptap/core';

/**
 * StrictDocument - 최상위 레벨에서 허용되는 노드를 객체 타입으로 엄격히 제한
 * '*'를 사용하여 완전히 비어있는 상태도 허용합니다.
 */
export const StrictDocument = Document.extend({
  content: '(blockBody | blockTitle | scheduleItem | emotionDiagram | photoGallery | weatherObject | daySeparator | premiumDivider)*',
});

/**
 * ObjectWorkflow - 에디팅 워크플로우를 객체 지향적으로 제어
 * 슬래시 명령어(/제목, /본문 등) 처리 및 개행 로직 고도화
 */
export const ObjectWorkflow = Extension.create({
  name: 'objectWorkflow',

  addKeyboardShortcuts() {
    return {
      // 일반 Enter: 본문 내 개행 또는 슬래시 명령어 실행
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        // 현재 행의 텍스트 추출 (커서 이전)
        const currentLineText = $from.nodeBefore?.isText 
          ? $from.nodeBefore.text?.split('\n').pop() || '' 
          : '';
        
        // 슬래시 명령어 패턴 매칭
        const slashMatch = currentLineText.match(/^\/(\S+)$/);
        
        if (slashMatch) {
          const command = slashMatch[1];
          const keywords: Record<string, string> = {
            '제목': 'blockTitle',
            '본문': 'blockBody',
            '이벤트': 'scheduleItem', 
            '행동': 'scheduleItem_activity', // 특별 처리용 가상 타입
            '날짜': 'daySeparator',
            '시간': 'timeMarker',
          };

          const targetType = keywords[command];
          
          if (targetType) {
            // 슬래시 텍스트 삭제
            const from = $from.pos - (command.length + 1);
            const to = $from.pos;

            const currentNode = $from.node($from.depth);
            const isEmpty = currentNode.content.size <= (command.length + 1);

            // 로직: 비어있으면 변환, 내용 있으면 아래에 삽입
            if (isEmpty) {
              const nodeType = targetType === 'scheduleItem_activity' ? 'scheduleItem' : targetType;
              const attrs = targetType === 'scheduleItem_activity' ? { type: 'activity' } : {};
              
              const nodeWithContent = (nodeType === 'scheduleItem' || nodeType === 'callout')
                ? { type: nodeType, attrs, content: [{ type: 'blockBody' }] }
                : { type: nodeType, attrs };

              return this.editor.chain()
                .deleteRange({ from, to })
                .insertContent(nodeWithContent)
                .run();
            } else {
              const nodeType = targetType === 'scheduleItem_activity' ? 'scheduleItem' : targetType;
              let attrs: any = targetType === 'scheduleItem_activity' ? { type: 'activity' } : {};
              
              // 날짜(/날짜)인 경우 적절한 Day 번호 계산
              if (nodeType === 'daySeparator') {
                let maxDay = 0;
                this.editor.state.doc.descendants((node) => {
                  if (node.type.name === 'daySeparator') maxDay = Math.max(maxDay, node.attrs.day);
                });
                attrs = { ...attrs, day: maxDay + 1 };
              }

              const nodeWithContent = (nodeType === 'scheduleItem' || nodeType === 'callout')
                ? { type: nodeType, attrs, content: [{ type: 'blockBody' }] }
                : { type: nodeType, attrs };

              return this.editor.chain()
                .deleteRange({ from, to })
                .insertContentAt($from.after(), nodeWithContent)
                .focus($from.after() + 1)
                .run();
            }
          }
        }

        // 기본적으로 본문(BlockBody) 내에서는 개행(HardBreak) 수행
        const currentNode = $from.node($from.depth);
        if (currentNode.type.name === 'blockBody') {
          return this.editor.commands.setHardBreak();
        }

        // 제목 등 다른 객체에서는 엔터 시 새로운 본문 객체 생성
        // 단, 이미 비어있는 본문이 바로 다음에 있다면 중복 생성을 방지합니다.
        if (currentNode.type.name === 'blockTitle') {
          const { doc } = state;
          const nextNode = doc.nodeAt($from.after());
          if (nextNode && nextNode.type.name === 'blockBody' && nextNode.content.size === 0) {
            return this.editor.commands.focus($from.after() + 1);
          }
          
          return this.editor.chain()
            .insertContentAt($from.after(), { type: 'blockBody' })
            .focus($from.after() + 1)
            .run();
        }

        return false;
      },
      
      // Shift+Enter: 입력을 종료하고 라이브러리 팝오버 호출 신호
      'Shift-Enter': () => {
        const { state } = this.editor;
        const { selection } = state;
        
        // depth > 1이면 중첩된 노드 내부임 (doc depth=0, top-level node depth=1)
        // 일정 프레임 내부 등에서 또 다른 객체를 추가하는 것을 방지
        if (selection.$from.depth > 1) return true;

        const event = new CustomEvent('pplaner:open-library', { 
          detail: { pos: selection.$from.after() } 
        });
        window.dispatchEvent(event);
        
        return true;
      },

      // Tab: 다음 블록으로 이동, 끝이면 라이브러리 열기
      'Tab': () => {
        const { state } = this.editor;
        const { selection, doc } = state;
        const { $from } = selection;

        let nextBlockPos = -1;
        doc.nodesBetween($from.pos, doc.content.size, (node, pos) => {
          if (nextBlockPos !== -1) return false;
          if (pos > $from.pos && node.isBlock && node.type.name !== 'doc') {
            nextBlockPos = pos;
            return false;
          }
        });

        if (nextBlockPos !== -1) {
          this.editor.commands.focus(nextBlockPos + 1);
          return true;
        }

        // 끝이면 라이브러리 열기
        const event = new CustomEvent('pplaner:open-library', { 
          detail: { pos: doc.content.size } 
        });
        window.dispatchEvent(event);
        return true;
      },

      // Shift-Tab: 이전 블록으로 이동
      'Shift-Tab': () => {
        const { state } = this.editor;
        const { selection, doc } = state;
        const { $from } = selection;

        let prevBlockPos = -1;
        doc.nodesBetween(0, $from.pos, (node, pos) => {
          if (node.isBlock && node.type.name !== 'doc' && pos < $from.start() - 1) {
            prevBlockPos = pos;
          }
        });

        if (prevBlockPos !== -1) {
          this.editor.commands.focus(prevBlockPos + 1);
          return true;
        }

        return true;
      },

      // Backspace: 비어있는 노드에서 백스페이스 시 노드 삭제 허용
      Backspace: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;
        
        if (empty && $from.parent.type.name === 'blockBody' && $from.parent.content.size === 0) {
          // 비어있는 본문 객체에서 백스페이스 시 해당 노드 삭제
          return this.editor.commands.deleteNode('blockBody');
        }
        
        return false;
      },
    };
  },
});
