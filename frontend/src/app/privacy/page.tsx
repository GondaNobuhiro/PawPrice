import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'プライバシーポリシー',
    description: 'PawPriceのプライバシーポリシーです。',
};

export default function PrivacyPage() {
    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="mb-8 text-2xl font-bold text-[#1C1917]">プライバシーポリシー</h1>

            <div className="space-y-8 text-sm leading-relaxed text-[#44403C]">
                <section>
                    <p>
                        PawPrice（以下「当サービス」）は、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">1. 収集する情報</h2>
                    <p className="mb-2">当サービスは、以下の情報を収集することがあります。</p>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>セッションID（Cookie により自動生成）</li>
                        <li>プッシュ通知の購読情報（エンドポイント・暗号化キー）</li>
                        <li>ウォッチリストに登録した商品情報</li>
                        <li>アクセスログ（IPアドレス、ブラウザ情報、閲覧ページ等）</li>
                    </ul>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">2. 利用目的</h2>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>ウォッチリスト・価格通知機能の提供</li>
                        <li>サービスの改善・不具合対応</li>
                        <li>アクセス解析（Google Analytics）</li>
                    </ul>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">3. Cookie・アクセス解析</h2>
                    <p className="mb-2">
                        当サービスはセッション管理のために Cookie を使用します。また、Google LLC が提供する Google Analytics を利用してアクセス解析を行っています。Google Analytics は Cookie を使用してデータを収集しますが、個人を特定する情報は含まれません。
                    </p>
                    <p>
                        Google Analytics のデータ収集を無効にする場合は、
                        <a
                            href="https://tools.google.com/dlpage/gaoptout"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#0284C7] underline underline-offset-2"
                        >
                            Google アナリティクス オプトアウト アドオン
                        </a>
                        をご利用ください。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">4. アフィリエイトプログラムについて</h2>
                    <p>
                        当サービスは、楽天グループ株式会社および Yahoo! JAPANのアフィリエイトプログラムに参加しています。商品ページへのリンクを経由してご購入いただいた場合、当サービスに報酬が発生することがあります。表示している価格・情報はアフィリエイト報酬に影響されません。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">5. 第三者提供</h2>
                    <p>
                        当サービスは、法令に基づく場合を除き、収集した情報を第三者に提供しません。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">6. 情報の管理</h2>
                    <p>
                        収集した情報は適切な安全管理措置を講じて保管します。不要になった情報は速やかに削除します。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">7. プライバシーポリシーの変更</h2>
                    <p>
                        当サービスは、必要に応じてプライバシーポリシーを変更することがあります。変更後のポリシーは本ページに掲載した時点から効力を生じます。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">8. お問い合わせ</h2>
                    <p>
                        個人情報の取り扱いに関するお問い合わせは、サイト内のお問い合わせフォームよりご連絡ください。
                    </p>
                </section>

                <p className="text-xs text-[#A8A29E]">制定日：2026年5月17日</p>
            </div>
        </main>
    );
}
