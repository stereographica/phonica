import React from 'react';
import {
  Mic,
  MapPin,
  Calendar,
  BarChart3,
  FileText,
  Plus,
  Upload,
  CheckCircle,
  Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface WidgetEmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  variant?: 'materials' | 'location' | 'activity' | 'statistics' | 'organized' | 'default';
  size?: 'sm' | 'md' | 'lg';
  illustration?: React.ReactNode;
}

/**
 * ウィジェット用統一空状態表示コンポーネント
 *
 * 機能:
 * - データタイプ別の適切なアイコンとメッセージ
 * - ポジティブで建設的なメッセージ
 * - CTAボタン対応
 * - サイズバリエーション対応
 */
export function WidgetEmptyState({
  title,
  description,
  action,
  variant = 'default',
  size = 'md',
  illustration,
}: WidgetEmptyStateProps) {
  // バリエーション別の設定
  const variantConfig = {
    materials: {
      icon: Mic,
      defaultTitle: '素材がありません',
      defaultDescription: '最初の音声を録音してコレクションを始めましょう！',
      iconClass: 'text-blue-500',
      suggestion: '新しい録音を追加して、音のライブラリを作成しましょう。',
    },
    location: {
      icon: MapPin,
      defaultTitle: '位置情報付きの素材がありません',
      defaultDescription: '録音時に位置情報を追加して、音の地図を作成しましょう',
      iconClass: 'text-green-500',
      suggestion: '録音時にGPSを有効にすると、音の記録場所が地図に表示されます。',
    },
    activity: {
      icon: Calendar,
      defaultTitle: '録音活動がありません',
      defaultDescription: '録音を開始して活動履歴を作成しましょう',
      iconClass: 'text-purple-500',
      suggestion: '定期的な録音で、あなたの音収集の進捗を可視化できます。',
    },
    statistics: {
      icon: BarChart3,
      defaultTitle: '統計データがありません',
      defaultDescription: '素材が追加されると統計が表示されます',
      iconClass: 'text-orange-500',
      suggestion: 'タグや機材情報を追加すると、詳細な統計が利用できます。',
    },
    organized: {
      icon: CheckCircle,
      defaultTitle: '整理が必要な素材はありません',
      defaultDescription: 'すべての素材が適切に整理されています！',
      iconClass: 'text-emerald-500',
      suggestion: '素晴らしい！メタデータの管理ができています。',
    },
    default: {
      icon: FileText,
      defaultTitle: 'データがありません',
      defaultDescription: 'データが追加されると、ここに表示されます',
      iconClass: 'text-gray-500',
      suggestion: '',
    },
  };

  // サイズ別の設定
  const sizeConfig = {
    sm: {
      container: 'p-3 space-y-2',
      icon: 'h-8 w-8',
      title: 'text-sm font-medium',
      description: 'text-xs',
      button: 'text-xs px-2 py-1',
    },
    md: {
      container: 'p-6 space-y-4',
      icon: 'h-12 w-12',
      title: 'text-base font-semibold',
      description: 'text-sm',
      button: 'text-sm px-3 py-2',
    },
    lg: {
      container: 'p-8 space-y-6',
      icon: 'h-16 w-16',
      title: 'text-lg font-semibold',
      description: 'text-base',
      button: 'text-base px-4 py-2',
    },
  };

  const config = variantConfig[variant];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;

  return (
    <div
      className={`${sizeStyles.container} flex flex-col items-center justify-center text-center`}
    >
      {illustration || <Icon className={`${sizeStyles.icon} ${config.iconClass} mb-2`} />}

      <div className="space-y-1 max-w-sm">
        <h3 className={`${sizeStyles.title} text-foreground`}>{displayTitle}</h3>
        <p className={`${sizeStyles.description} text-muted-foreground`}>{displayDescription}</p>
        {config.suggestion && (
          <p className={`${sizeStyles.description} text-muted-foreground opacity-75 italic`}>
            {config.suggestion}
          </p>
        )}
      </div>

      {action && (
        <Button
          variant={action.variant || 'default'}
          size={size === 'sm' ? 'sm' : 'default'}
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * 素材空状態（録音促進用）
 */
export function MaterialsEmptyState({ onAddMaterial }: { onAddMaterial?: () => void }) {
  return (
    <WidgetEmptyState
      variant="materials"
      title="音のコレクションを始めましょう"
      description="あなたの周りの音を録音して、音のライブラリを作成しましょう"
      action={
        onAddMaterial
          ? {
              label: '録音を開始',
              onClick: onAddMaterial,
              variant: 'default',
            }
          : undefined
      }
      illustration={
        <div className="relative">
          <Mic className="h-12 w-12 text-blue-500" />
          <div className="absolute -top-1 -right-1">
            <Plus className="h-5 w-5 text-blue-600 bg-blue-100 rounded-full p-1" />
          </div>
        </div>
      }
    />
  );
}

/**
 * 未整理素材なし状態（ポジティブなメッセージ）
 */
export function OrganizedEmptyState() {
  return (
    <WidgetEmptyState
      variant="organized"
      title="完璧に整理されています！"
      description="すべての素材が適切にタグ付けと説明が完了しています"
      size="md"
      illustration={
        <div className="relative">
          <CheckCircle className="h-12 w-12 text-emerald-500" />
          <div className="absolute -top-1 -right-1 animate-ping">
            <div className="h-3 w-3 bg-emerald-400 rounded-full"></div>
          </div>
        </div>
      }
    />
  );
}

/**
 * 位置情報空状態
 */
export function LocationEmptyState() {
  return (
    <WidgetEmptyState
      variant="location"
      title="音の地図を作成しましょう"
      description="録音時に位置情報を有効にして、あなたの音収集の軌跡を可視化しましょう"
      illustration={
        <div className="relative">
          <MapPin className="h-12 w-12 text-green-500" />
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      }
    />
  );
}

/**
 * 今日の音空状態
 */
export function TodaySoundEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <WidgetEmptyState
      variant="materials"
      title="音の冒険を始めましょう"
      description="最初の音声を録音して、毎日の「今日の音」を楽しみましょう"
      action={
        onRefresh
          ? {
              label: '新しい音を探す',
              onClick: onRefresh,
              variant: 'outline',
            }
          : undefined
      }
      illustration={
        <div className="relative">
          <Music className="h-12 w-12 text-blue-500" />
          <div className="absolute -top-1 -right-1">
            <div className="h-4 w-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      }
    />
  );
}

/**
 * インライン空状態（コンパクト版）
 */
export function InlineEmptyState({
  message = 'データがありません',
  icon: Icon = FileText,
}: {
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <Icon className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * アップロード促進用空状態
 */
export function UploadEmptyState({ onUpload }: { onUpload?: () => void }) {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/25 p-8">
      <WidgetEmptyState
        title="ファイルをアップロード"
        description="音声ファイルをドラッグ&ドロップするか、ボタンを押して選択してください"
        action={
          onUpload
            ? {
                label: 'ファイルを選択',
                onClick: onUpload,
                variant: 'outline',
              }
            : undefined
        }
        illustration={
          <div className="relative">
            <Upload className="h-12 w-12 text-blue-500" />
            <div className="absolute -top-2 -right-2 animate-bounce">
              <div className="h-3 w-3 bg-blue-400 rounded-full"></div>
            </div>
          </div>
        }
      />
    </Card>
  );
}
