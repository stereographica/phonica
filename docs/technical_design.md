# 技術設計ドキュメント

## slug 生成ルール

システム内で使用される slug は、以下のルールに従って生成されます。

- **基本ルール:**
    - slug は英数字の小文字のみで構成されます。
    - 単語間のセパレータとしてはハイフン (`-`) を使用します。

- **文字種別ごとの変換ルール:**
    - **ひらがな・カタカナ:** [jaconv](https://pypi.org/project/jaconv/) ライブラリを使用してローマ字（ヘボン式）に変換します。
        - 例: 「ふぃーるどれこーでぃんぐ」 → `firudorekodingu`
    - **漢字:** ピンイン表記に変換します。使用するライブラリや詳細な変換方法は別途選定・規定します。
        - 例: 「録音」 → `luyin` (仮)
    - **記号（全角・半角）:** すべて削除します。
        - 例: 「Test Title! #1」 → `testtitle1` (スペースも記号として扱われ削除、またはハイフンに置換されるかは要確認。ここでは削除を優先)
    - **英大文字:** 小文字に変換します。
        - 例: 「New Recording」 → `newrecording`

- **特殊ケース:**
    - 上記の変換処理および記号削除の結果、slug の文字列長が0文字になってしまった場合は、システムがランダムで人間にとって読みやすい（frendly name）短い文字列を生成し、それを slug として使用します。このランダムな文字列はユニーク性を保証する必要はありませんが、衝突の可能性を低減する努力は行います（例: `unique-sound-xxxx` のような形式）。

- **最終的な整形:**
    - 複数のハイフンが連続した場合は、1つのハイフンにまとめます。
    - 先頭または末尾にハイフンが存在する場合は削除します。

## 考慮事項

- ピンイン変換ライブラリの選定と、具体的な変換オプション（声調の扱いなど）を決定する必要があります。
- 「記号削除」のルールについて、スペースの扱いを明確にする必要があります。（現在は削除としていますが、ハイフンへの置換も考えられます。）
- friendly name の生成ロジックと、その語彙セットを定義する必要があります。 
