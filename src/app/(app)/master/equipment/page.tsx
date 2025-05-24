'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';

// ダミーデータ型
interface Equipment {
  id: string;
  name: string;
  type: string; // e.g., "Recorder", "Microphone"
  manufacturer: string | null;
  memo: string | null;
}

// ダミーデータ
const dummyEquipments: Equipment[] = [
  {
    id: '1',
    name: 'Zoom H5',
    type: 'Recorder',
    manufacturer: 'Zoom',
    memo: 'Main handy recorder',
  },
  {
    id: '2',
    name: 'Audio-Technica AT8022',
    type: 'Microphone',
    manufacturer: 'Audio-Technica',
    memo: 'X/Y Stereo Microphone',
  },
  {
    id: '3',
    name: 'Sennheiser MKH 8040',
    type: 'Microphone',
    manufacturer: 'Sennheiser',
    memo: 'Cardioid mic, for ORTF pair',
  },
];

export default function EquipmentMasterPage() {
  // TODO: 将来的にはServer ActionやAPIからデータを取得
  const equipments = dummyEquipments;

  // TODO: 新規機材登録モーダルの表示状態管理と表示ロジック
  // TODO: 機材編集モーダルの表示状態管理と表示ロジック

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Equipment Master</h1>
        <Button onClick={() => alert('Open New Equipment Modal')}> {/* TODO: モーダル表示処理 */}
          <PlusCircle className="mr-2 h-4 w-4" />
          New Equipment
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Memo</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipments.map((equipment) => (
              <TableRow key={equipment.id}>
                <TableCell className="font-medium">{equipment.name}</TableCell>
                <TableCell>{equipment.type}</TableCell>
                <TableCell>{equipment.manufacturer || '-'}</TableCell>
                <TableCell>{equipment.memo || '-'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => alert(`Edit: ${equipment.name}`)}> {/* TODO: 編集モーダル表示 */}
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => alert(`Delete: ${equipment.name}`)}> {/* TODO: 削除処理 */}
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* TODO: ページネーションは後で追加 */}

      {/* TODO: 新規機材登録モーダル (E-2) は別コンポーネントとして作成し、ここで制御 */}
      {/* TODO: 機材編集モーダル (E-2 と同様のUI) は別コンポーネントとして作成し、ここで制御 */}
    </div>
  );
} 
