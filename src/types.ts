export type ToolId =
  | 'merge'
  | 'split'
  | 'compress'
  | 'reorder'
  | 'sign'
  | 'protect'
  | 'extract'
  | 'delete'
  | 'pdf-to-images'
  | 'images-to-pdf'
  | 'watermark'
  | 'page-numbers'
  | 'metadata'

export type Screen =
  | 'home'
  | 'progress'
  | 'result'
  | 'licenses'
  | 'legal'
  | ToolId
