import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Trascinamento per riordinare una lista o una griglia, con mouse, dito e penna.
 *
 * Sostituisce il drag-and-drop HTML5 (`draggable`), che sui telefoni non
 * funziona: Safari su iPhone non lo supporta per spostare elementi nella pagina.
 *
 * - Mouse: il trascinamento parte dopo pochi pixel di movimento.
 * - Dito/penna: parte con una pressione prolungata (LONG_PRESS_MS). Così uno
 *   swipe veloce continua a scorrere la pagina come sempre.
 * - Vicino ai bordi del contenitore che scorre, la lista scorre da sola.
 *
 * Ogni elemento deve avere `data-sort-index` e i props di `itemProps(index)`.
 */

const LONG_PRESS_MS = 280
// Oltre questa distanza prima del long press, il gesto è uno scroll.
const TOUCH_SLOP_PX = 10
const MOUSE_START_PX = 5
const EDGE_PX = 64
const MAX_SCROLL_SPEED = 14

export type SortDrag = {
  /** Posizione dell'elemento trascinato. */
  from: number
  /** Posizione su cui verrebbe lasciato. */
  over: number
  /** Spostamento da applicare all'elemento trascinato (segue il puntatore). */
  dx: number
  dy: number
}

type Gesture = {
  index: number
  pointerId: number
  pointerType: string
  startX: number
  startY: number
  lastX: number
  lastY: number
  scroller: HTMLElement
  startScrollTop: number
  timer: number | null
  dragging: boolean
}

function scrollParent(element: HTMLElement): HTMLElement {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node
    }
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

function indexAt(x: number, y: number): number | null {
  const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sort-index]')
  return target ? Number(target.dataset.sortIndex) : null
}

export function usePointerSort(onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<SortDrag | null>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const frameRef = useRef<number | null>(null)
  // onMove cambia a ogni render (chiude su `order`): teniamo l'ultima versione.
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  // I gestori vengono registrati su `window`: devono essere sempre le stesse
  // funzioni, altrimenti removeEventListener non li troverebbe. Li creiamo una
  // volta sola; usano solo ref e setDrag, che sono stabili.
  const handlers = useMemo(() => {
    function update(gesture: Gesture) {
      const scrolled = gesture.scroller.scrollTop - gesture.startScrollTop
      setDrag((current) => {
        const over = indexAt(gesture.lastX, gesture.lastY) ?? current?.over ?? gesture.index
        return {
          from: gesture.index,
          over,
          dx: gesture.lastX - gesture.startX,
          // Se il contenitore scorre, l'elemento si sposta con lui: lo
          // compensiamo perché resti sotto il dito.
          dy: gesture.lastY - gesture.startY + scrolled,
        }
      })
    }

    // Auto-scroll: finché il puntatore è vicino al bordo, scorriamo a ogni frame.
    function autoScroll() {
      const gesture = gestureRef.current
      if (!gesture?.dragging) return

      const isPage = gesture.scroller === document.scrollingElement
      const rect = isPage
        ? { top: 0, bottom: window.innerHeight }
        : gesture.scroller.getBoundingClientRect()

      let speed = 0
      if (gesture.lastY < rect.top + EDGE_PX) {
        speed = -MAX_SCROLL_SPEED * (1 - (gesture.lastY - rect.top) / EDGE_PX)
      } else if (gesture.lastY > rect.bottom - EDGE_PX) {
        speed = MAX_SCROLL_SPEED * (1 - (rect.bottom - gesture.lastY) / EDGE_PX)
      }

      if (speed !== 0) {
        gesture.scroller.scrollTop += Math.max(-MAX_SCROLL_SPEED, Math.min(MAX_SCROLL_SPEED, speed))
        update(gesture)
      }
      frameRef.current = requestAnimationFrame(autoScroll)
    }

    function begin(gesture: Gesture) {
      gesture.dragging = true
      gesture.timer = null
      navigator.vibrate?.(10)
      update(gesture)
      frameRef.current = requestAnimationFrame(autoScroll)
    }

    // Durante il trascinamento col dito il browser non deve scorrere la pagina.
    // Serve un listener touchmove non passivo: touch-action non si può cambiare
    // a gesto iniziato.
    function blockTouchScroll(event: TouchEvent) {
      if (gestureRef.current?.dragging) event.preventDefault()
    }

    function onPointerMove(event: PointerEvent) {
      const gesture = gestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) return

      gesture.lastX = event.clientX
      gesture.lastY = event.clientY
      const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)

      if (!gesture.dragging) {
        if (gesture.pointerType === 'mouse') {
          if (distance > MOUSE_START_PX) begin(gesture)
        } else if (distance > TOUCH_SLOP_PX) {
          // Il dito si è mosso prima del long press: è uno scroll, lasciamo stare.
          stop()
        }
        return
      }

      update(gesture)
    }

    function onPointerUp(event: PointerEvent) {
      const gesture = gestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) return

      if (gesture.dragging) {
        const to = indexAt(event.clientX, event.clientY)
        if (to !== null && to !== gesture.index) onMoveRef.current(gesture.index, to)
      }
      stop()
    }

    function onPointerCancel() {
      stop()
    }

    function stop() {
      const gesture = gestureRef.current
      if (gesture?.timer) clearTimeout(gesture.timer)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      gestureRef.current = null
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('touchmove', blockTouchScroll)
      setDrag(null)
    }

    return { stop, onPointerMove, onPointerUp, onPointerCancel, blockTouchScroll, begin }
  }, [])

  useEffect(() => () => handlers.stop(), [handlers])

  function itemProps(index: number) {
    return {
      'data-sort-index': index,
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        // Solo tasto principale, e non sui pulsanti dentro l'elemento (×, ↑, ↓).
        if (event.button !== 0 || gestureRef.current) return
        if ((event.target as HTMLElement).closest('button, a, input, select')) return

        const gesture: Gesture = {
          index,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          scroller: scrollParent(event.currentTarget),
          startScrollTop: 0,
          timer: null,
          dragging: false,
        }
        gesture.startScrollTop = gesture.scroller.scrollTop
        gestureRef.current = gesture

        if (event.pointerType === 'mouse') {
          // Niente selezione del testo mentre si trascina.
          event.preventDefault()
        } else {
          gesture.timer = window.setTimeout(() => handlers.begin(gesture), LONG_PRESS_MS)
        }

        window.addEventListener('pointermove', handlers.onPointerMove)
        window.addEventListener('pointerup', handlers.onPointerUp)
        window.addEventListener('pointercancel', handlers.onPointerCancel)
        window.addEventListener('touchmove', handlers.blockTouchScroll, { passive: false })
      },
      // Il menu del long press (copia immagine, ecc.) interferirebbe col gesto.
      onContextMenu: (event: React.MouseEvent) => {
        if (gestureRef.current) event.preventDefault()
      },
    }
  }

  /** Stile per l'elemento trascinato: lo fa seguire il puntatore. */
  function dragStyle(index: number): React.CSSProperties | undefined {
    if (!drag || drag.from !== index) return undefined
    return { transform: `translate(${drag.dx}px, ${drag.dy}px)` }
  }

  return { drag, itemProps, dragStyle }
}
