import type { ProductDetailBrand } from "../../../services/productService";

interface ShopCardProps {
  brand: ProductDetailBrand;
}

export default function ShopCard({ brand }: ShopCardProps) {
  const links = [
    { key: "store", label: "เว็บไซต์ร้าน", url: brand.store_url },
    { key: "facebook", label: "Facebook", url: brand.facebook_url },
    { key: "instagram", label: "Instagram", url: brand.instagram_url },
    {
      key: "line",
      label: "LINE",
      url: brand.line_id ? `https://line.me/ti/p/~${brand.line_id}` : null,
    },
  ].filter((link) => Boolean(link.url));

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#3E2C25]">
        <span className="h-5 w-1.5 rounded-full bg-[#3E2C25]" aria-hidden="true" />
        ร้านค้า
      </h2>

      <div className="pd-lift rounded-3xl border border-[#DCC3B3] bg-white p-5 pd-card md:p-6">
        <div className="flex items-center gap-4">
          {/* โลโก้ร้าน */}
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={`โลโก้ร้าน ${brand.brand_name}`}
              className="h-16 w-16 shrink-0 rounded-2xl border border-[#EADCCF] object-cover shadow-2xs"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FAF5EF] text-2xl font-bold text-[#3E2C25] border border-[#EADCCF]">
              {brand.brand_name?.charAt(0)?.toUpperCase() ?? "ร"}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[#3E2C25]">
              {brand.brand_name}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#947D6D]">
              ร้านค้าที่ผ่านการยืนยันตัวตน
            </p>
          </div>
        </div>

        {links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#F0E4D8] pt-4">
            {links.map((link) => (
              <a
                key={link.key}
                href={link.url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#DCC3B3] bg-[#FAF5EF]/60 px-4 py-2 text-xs font-medium text-[#49352D] transition-all duration-200 hover:border-[#3E2C25] hover:bg-[#3E2C25] hover:text-white"
              >
                <span>{link.label}</span>
                <span className="text-[10px] opacity-70">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}