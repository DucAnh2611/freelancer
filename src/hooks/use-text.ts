import { texts } from '@/constants/text'
import { textBind } from '@/lib/text'

export function useText() {
  return { text: texts, textBind }
}
