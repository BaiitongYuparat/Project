interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-col flex-wrap gap-2">
      <label className="text-sm text-left font-medium text-secondary">
        หมวดหมู่สินค้า
      </label>
      <div className="flex flex-wrap gap-2 justify-start">
        <button
          onClick={() => onChange("all")}
          className={`rounded-full px-5 py-2 text-sm transition ${
            selectedCategory === "all"
              ? "bg-secondary text-white"
              : "bg-white/40 text-secondary hover:bg-primary/80"
          }`}
        >
          ทั้งหมด
        </button>

        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onChange(category)}
            className={`rounded-full px-5 py-2 text-sm transition ${
              selectedCategory === category
                ? "bg-secondary text-white"
                : "bg-white/40 text-secondary hover:bg-primary/80"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
