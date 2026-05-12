import './CategoryTabs.css';

export default function CategoryTabs({ categories, activeId, onChange }) {
  return (
    <div className="category-tabs">
      <div
        className={`category-tab ${activeId === null ? 'active' : ''}`}
        onClick={() => onChange(null)}
      >
        全部
      </div>
      {categories.map((cat) => (
        <div
          key={cat.id}
          className={`category-tab ${activeId === cat.id ? 'active' : ''}`}
          onClick={() => onChange(cat.id)}
        >
          {cat.name}
        </div>
      ))}
    </div>
  );
}
