import type { IconName } from '../components/Icon'
import type { ToolId } from '../types'

export type Tool = {
  id: ToolId
  title: string
  description: string
  action: string
  actionOneFile: string
  actionManyFiles: (count: number) => string
  features: string[]
  icon: IconName
}

export const featuredTools: Tool[] = [
  {
    id: 'merge',
    title: 'Merge',
    description: 'Combine PDFs in the order you want.',
    action: 'Merge PDFs',
    actionOneFile: 'Add another PDF',
    actionManyFiles: (count) => `Merge ${count} PDFs`,
    features: ['Any order', 'No uploads', 'Up to 100 MB each'],
    icon: 'merge',
  },
  {
    id: 'split',
    title: 'Split',
    description: 'Split a document into clean pieces.',
    action: 'Split PDF',
    actionOneFile: 'Split this PDF',
    actionManyFiles: () => 'Split the first PDF',
    features: ['Page ranges', 'Extract', 'On your device'],
    icon: 'split',
  },
  {
    id: 'compress',
    title: 'Compress',
    description: 'Make your PDFs lighter, at the quality you choose.',
    action: 'Compress PDF',
    actionOneFile: 'Compress this PDF',
    actionManyFiles: () => 'Compress the first PDF',
    features: ['3 quality levels', 'Save space', 'Private'],
    icon: 'compress',
  },
  {
    id: 'reorder',
    title: 'Reorder',
    description: 'Move pages until everything flows.',
    action: 'Reorder pages',
    actionOneFile: 'Reorder this PDF',
    actionManyFiles: () => 'Reorder the first PDF',
    features: ['Drag & drop', 'Rotate', 'Preview'],
    icon: 'reorder',
  },
  {
    id: 'sign',
    title: 'Sign',
    description: 'Add your name, initials or a drawn signature.',
    action: 'Sign PDF',
    actionOneFile: 'Sign this PDF',
    actionManyFiles: () => 'Sign the first PDF',
    features: ['Draw', 'Type', 'Visual only'],
    icon: 'sign',
  },
  {
    id: 'protect',
    title: 'Protect',
    description: 'Add or remove a password in seconds.',
    action: 'Protect PDF',
    actionOneFile: 'Protect this PDF',
    actionManyFiles: () => 'Protect the first PDF',
    features: ['Private', 'Simple', 'On your device'],
    icon: 'protect',
  },
]
