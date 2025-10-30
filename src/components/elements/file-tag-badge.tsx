export interface FileTagBadgeProps {
  filePath: string;
}

export function FileTagBadge({ filePath }: FileTagBadgeProps) {
  return (
    <span
      contentEditable={false}
      className="inline-flex items-center gap-1 text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded text-sm align-middle"
      data-file-tag={filePath}
    >
      <span className="text-[10px]">📄</span>
      <span>@{filePath}</span>
    </span>
  );
}
