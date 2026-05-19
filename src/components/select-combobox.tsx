import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'

export type SelectItem<T extends string> = { value: T; label: string }

type SelectComboboxProps<T extends string> = {
  items: SelectItem<T>[]
  value: T | null
  onChange: (value: T | null) => void
  placeholder?: string
  emptyLabel?: string
  showClear?: boolean
  disabled?: boolean
  'aria-invalid'?: boolean
}

export function SelectCombobox<T extends string>({
  items,
  value,
  onChange,
  placeholder,
  emptyLabel,
  showClear = false,
  disabled = false,
  'aria-invalid': ariaInvalid,
}: SelectComboboxProps<T>) {
  const selected = items.find((i) => i.value === value) ?? null

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(item) => onChange((item as SelectItem<T> | null)?.value ?? null)}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={showClear && !disabled}
        disabled={disabled}
        aria-invalid={ariaInvalid}
      />
      <ComboboxContent>
        {emptyLabel && <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>}
        <ComboboxList>
          {items.map((item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
