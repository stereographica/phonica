import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
  // redirectは例外をスローするため、ここには到達しませんが、
  // ESLintやTypeScriptがnullを返すコンポーネントを要求する場合があるため、
  // return null; を記述しておくこともあります。
  // しかし、Next.jsのredirectの挙動上、通常は不要です。
}
