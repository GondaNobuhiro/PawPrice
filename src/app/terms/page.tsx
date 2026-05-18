import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '利用規約',
    description: 'PawPriceの利用規約です。',
};

export default function TermsPage() {
    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="mb-8 text-2xl font-bold text-[#1C1917]">利用規約</h1>

            <div className="space-y-8 text-sm leading-relaxed text-[#44403C]">
                <section>
                    <p>
                        本利用規約（以下「本規約」）は、PawPrice（以下「当サービス」）の利用条件を定めるものです。ユーザーは本規約に同意のうえ、当サービスをご利用ください。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">1. サービスの概要</h2>
                    <p>
                        当サービスは、犬・猫用ペット用品の価格情報を複数のショッピングサイトから収集・比較して提供する情報サービスです。商品の販売は行っておりません。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">2. アフィリエイトリンクについて（PR）</h2>
                    <p className="mb-2">
                        当サービスに掲載している楽天市場の商品ページへのリンクは、楽天グループ株式会社のアフィリエイトプログラムを利用した広告リンク（PR）です。リンクを経由してご購入いただいた場合、当サービスに報酬が発生することがあります。
                    </p>
                    <p>
                        当サービスはAmazon.co.jpのアソシエイトとして、Amazonの商品を紹介することで収入を得ることがあります。商品詳細ページに掲載しているAmazonへのリンクはアフィリエイトリンク（PR）です。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">3. 価格情報の免責</h2>
                    <p className="mb-2">
                        当サービスが表示する価格・在庫・ポイント等の情報は、定期的に各ショッピングサイトから取得していますが、実際の購入時と異なる場合があります。
                    </p>
                    <p>
                        最終的な価格・在庫・購入条件は、必ず各ショッピングサイトの商品ページにてご確認ください。当サービスは表示情報の正確性・完全性について保証しません。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">4. 禁止事項</h2>
                    <p className="mb-2">ユーザーは以下の行為を行ってはなりません。</p>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>当サービスへの不正アクセス・過度な負荷をかける行為</li>
                        <li>当サービスのコンテンツを無断で複製・転載・商業利用する行為</li>
                        <li>当サービスの運営を妨害する行為</li>
                        <li>法令または公序良俗に反する行為</li>
                    </ul>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">5. 免責事項</h2>
                    <p>
                        当サービスは、サービスの提供・停止・変更、またはユーザーが当サービスを通じて購入した商品に関していかなる損害についても、故意または重過失がある場合を除き、責任を負いません。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">6. サービスの変更・終了</h2>
                    <p>
                        当サービスは、予告なくサービス内容の変更・停止・終了を行う場合があります。これによってユーザーに生じた損害について、当サービスは責任を負いません。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">7. 利用規約の変更</h2>
                    <p>
                        当サービスは、必要に応じて本規約を変更することがあります。変更後の規約は本ページに掲載した時点から効力を生じます。
                    </p>
                </section>

                <section>
                    <h2 className="mb-3 text-base font-semibold text-[#1C1917]">8. 準拠法・管轄裁判所</h2>
                    <p>
                        本規約は日本法に準拠します。当サービスに関する紛争については、福岡地方裁判所を第一審の専属的合意管轄裁判所とします。
                    </p>
                </section>

                <p className="text-xs text-[#A8A29E]">制定日：2026年5月17日</p>
            </div>
        </main>
    );
}
