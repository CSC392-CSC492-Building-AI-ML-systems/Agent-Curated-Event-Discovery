import { useAnalytics } from "../hooks/useAnalytics";
import type { EventideTag, BrowseState } from "../interfaces/interfaces";

type Props = {
  allTags: EventideTag[];
  selectedTags: EventideTag[];
  setBrowse: React.Dispatch<React.SetStateAction<BrowseState>>;
};

export default function TagFilters({
  allTags,
  selectedTags,
  setBrowse,
}: Props) {
  const { logTagClick } = useAnalytics();

  function handleTagClick(tag: EventideTag) {
    const isSelected = selectedTags.some(
      (selectedTag) => selectedTag.id === tag.id,
    );

    setBrowse((previous) => ({
      ...previous,
      tags: isSelected
        ? previous.tags.filter((selectedTag) => selectedTag.id !== tag.id)
        : [...previous.tags, tag],
    }));

    // Only log when the user adds a tag to their filters.
    if (!isSelected) {
      void logTagClick(tag.id);
    }
  }

  return (
    <div className="map-topics" role="group" aria-label="Filter by topic">
      <span>Include</span>

      {allTags.map((tag) => {
        const isSelected = selectedTags.some(
          (selectedTag) => selectedTag.id === tag.id,
        );

        return (
          <button
            key={tag.id}
            type="button"
            className={`discover-chip ${isSelected ? "active" : ""}`}
            aria-pressed={isSelected}
            onClick={() => handleTagClick(tag)}
          >
            #{tag.name}
          </button>
        );
      })}
    </div>
  );
}
