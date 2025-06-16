'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, FileAudio, Tag, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSearch } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, updateQuery, searchResults, isLoading } = useSearch();

  // 検索結果の表示数制限
  const displayResults = {
    materials: searchResults.materials?.slice(0, 5) || [],
    tags: searchResults.tags?.slice(0, 3) || [],
    equipment: searchResults.equipment?.slice(0, 3) || [],
  };

  const hasResults =
    displayResults.materials.length > 0 ||
    displayResults.tags.length > 0 ||
    displayResults.equipment.length > 0;

  // すべての検索結果を1つの配列にまとめる（キーボードナビゲーション用）
  const allResults = [
    ...displayResults.materials.map((item) => ({ type: 'material', item })),
    ...displayResults.tags.map((item) => ({ type: 'tag', item })),
    ...displayResults.equipment.map((item) => ({ type: 'equipment', item })),
  ];

  // 検索ボックスがフォーカスされたらPopoverを開く
  const handleFocus = () => {
    if (query.trim().length > 0) {
      setIsOpen(true);
    }
  };

  // 検索クエリが変更されたとき
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    updateQuery(newQuery);
    setIsOpen(newQuery.trim().length > 0);
    setSelectedIndex(-1); // 検索クエリが変わったら選択をリセット
  };

  // 結果をクリックしたときのナビゲーション
  const handleResultClick = useCallback(
    (type: string, item: { slug?: string; id?: string }) => {
      setIsOpen(false);
      updateQuery('');
      setSelectedIndex(-1);

      switch (type) {
        case 'material':
          router.push(`/materials/${item.slug}`);
          break;
        case 'tag':
          router.push(`/materials?tags=${item.slug}`);
          break;
        case 'equipment':
          router.push(`/master/equipment`);
          break;
      }
    },
    [router, updateQuery],
  );

  // キーボードナビゲーション
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || !hasResults) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allResults.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < allResults.length) {
            const selected = allResults[selectedIndex];
            handleResultClick(selected.type, selected.item);
          }
          break;
      }
    },
    [isOpen, hasResults, allResults, selectedIndex, handleResultClick],
  );

  // Escキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search materials..."
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-testid="global-search-results"
      >
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hasResults ? (
            <div className="p-2">
              {/* Materials Section */}
              {displayResults.materials.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                    MATERIALS
                  </h3>
                  <div className="space-y-1">
                    {displayResults.materials.map((material, index) => {
                      const globalIndex = index;
                      const isSelected = selectedIndex === globalIndex;
                      return (
                        <button
                          key={material.id}
                          onClick={() => handleResultClick('material', material)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none',
                            isSelected && 'bg-accent text-accent-foreground',
                          )}
                        >
                          <FileAudio className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{material.title}</div>
                            {material.locationName && (
                              <div className="text-xs text-muted-foreground">
                                {material.locationName}
                              </div>
                            )}
                          </div>
                          {material.score && (
                            <div className="text-xs text-muted-foreground">{material.score}%</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tags Section */}
              {displayResults.tags.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">TAGS</h3>
                  <div className="space-y-1">
                    {displayResults.tags.map((tag, index) => {
                      const globalIndex = displayResults.materials.length + index;
                      const isSelected = selectedIndex === globalIndex;
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleResultClick('tag', tag)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none',
                            isSelected && 'bg-accent text-accent-foreground',
                          )}
                        >
                          <Tag className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{tag.name}</div>
                          </div>
                          {tag._count && (
                            <div className="text-xs text-muted-foreground">
                              {tag._count.materials} materials
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Equipment Section */}
              {displayResults.equipment.length > 0 && (
                <div>
                  <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                    EQUIPMENT
                  </h3>
                  <div className="space-y-1">
                    {displayResults.equipment.map((equipment, index) => {
                      const globalIndex =
                        displayResults.materials.length + displayResults.tags.length + index;
                      const isSelected = selectedIndex === globalIndex;
                      return (
                        <button
                          key={equipment.id}
                          onClick={() => handleResultClick('equipment', equipment)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none',
                            isSelected && 'bg-accent text-accent-foreground',
                          )}
                        >
                          <Settings className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{equipment.name}</div>
                            {equipment.manufacturer && (
                              <div className="text-xs text-muted-foreground">
                                {equipment.manufacturer}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : query.trim().length > 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
