type SelectionNoticeProps = {
  /** Quanti PDF sono selezionati in tutto il sito. */
  count: number
  toolName: string
}

/**
 * La selezione di file è condivisa tra home e strumenti. Gli strumenti che
 * lavorano su un solo file usano il primo: se ce ne sono altri, lo diciamo.
 */
export function SelectionNotice({ count, toolName }: SelectionNoticeProps) {
  if (count < 2) return null

  return (
    <p className="form-message form-message--info" role="status">
      You selected {count} PDFs. {toolName} works on one file at a time, so it
      uses the first one. Remove it with × to move on to the next.
    </p>
  )
}
