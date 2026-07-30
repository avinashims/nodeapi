import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { categoryApi } from "../api/client";
import { useSearch } from "../context/SearchContext";

export default function CategoryMenu() {
  const [categories, setCategories] = useState([]);
  const { categoryId, setCategoryId } = useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    categoryApi
      .list()
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  function selectCategory(id) {
    setCategoryId(id);
    navigate("/");
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="category-menu">
      <div className="container category-menu__inner">
        <button
          type="button"
          className={`category-menu__item${categoryId === "" ? " category-menu__item--active" : ""}`}
          onClick={() => selectCategory("")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-menu__item${String(categoryId) === String(cat.id) ? " category-menu__item--active" : ""}`}
            onClick={() => selectCategory(String(cat.id))}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
