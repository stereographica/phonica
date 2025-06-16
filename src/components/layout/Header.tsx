import { GlobalSearch } from '@/components/search/GlobalSearch';

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        {/* TODO: アプリケーションロゴやアイコンを後で追加 */}
        <span className="font-semibold text-lg">Phonica</span>
      </div>
      <div className="relative ml-auto flex-1 md:grow-0">
        <GlobalSearch />
      </div>
      {/* TODO: 将来拡張用 (ユーザーアイコン、通知ベル) */}
    </header>
  );
}
