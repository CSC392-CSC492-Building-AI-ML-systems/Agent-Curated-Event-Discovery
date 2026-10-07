import {useState} from 'react';
import searchIcon from '../assets/images/plus.svg';
import closeIcon from '../assets/images/plus.svg';
type props = {
    items: Number[],
    setItems: Function,
    onClose?: Function,
    onSearch?: Function
}
function SearchBar({ items, setItems, onClose, onSearch}: props) {
    const [search, setSearch] = useState("");
    return <div className="searchBarContainer">
            <div className="searchBar">
                <input size={2} className="searchBarInput" placeholder="Search..." value={search} onChange={(e)=>setSearch(e.target.value)} onSubmit={()=>{onSearch && onSearch()}}></input>
                <img className="icon" src={searchIcon} alt="Search icon" onClick={()=>onSearch && onSearch()}/>
                {onClose && <img className="icon" src={closeIcon} alt="Close icon" onClick={()=>onClose()}/>}
            </div>            
          </div>
}

export default SearchBar;