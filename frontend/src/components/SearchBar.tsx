import searchIcon from '../assets/images/search-icon.svg';
import closeIcon from '../assets/images/close-icon.svg';

type Props = {
    search: string;
    setSearch: (value: string) => void;
    items?: number[];
    setItems?: (items: number[]) => void;
    onClose?: () => void;
    onSearch?: () => void;
    placeholder?: string;
};

export default function SearchBar({ search, setSearch, onClose, onSearch, placeholder = 'Search...' }: Props) {
    return <form className="searchBarContainer" role="search" onSubmit={event => { event.preventDefault(); onSearch?.(); }}>
        <div className="searchBar">
            <input className="searchBarInput" aria-label="Search events" placeholder={placeholder} value={search} onChange={event => setSearch(event.target.value)} />
            {search && <button type="button" className="searchBarButton" aria-label="Clear search" onClick={() => setSearch('')}>×</button>}
            <button type="submit" className="searchBarButton" aria-label="Search"><img className="icon" src={searchIcon} alt="" /></button>
            {onClose && <button type="button" className="searchBarButton" aria-label="Close event list" onClick={onClose}><img className="close-icon" src={closeIcon} alt="" /></button>}
        </div>
    </form>;
}
