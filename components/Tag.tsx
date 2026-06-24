import type { SelectOption } from "@/lib/types";
import { TAG_STYLES } from "@/lib/colors";

export function Tag({ option }: { option: SelectOption }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TAG_STYLES[option.color]}`}
    >
      {option.value}
    </span>
  );
}
