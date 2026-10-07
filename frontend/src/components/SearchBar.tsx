import {useState} from 'react';
import searchIcon from '../assets/images/search-icon.svg';
import closeIcon from '../assets/images/close-icon.svg';
type props = {
    search: string,
    setSearch: Function,
    items: Number[],
    setItems: Function,
    onClose?: Function,
    onSearch?: Function
}
function SearchBar({ search, setSearch, items, setItems, onClose, onSearch}: props) {
    return <div className="searchBarContainer">
            <div className="searchBar">
                <input size={2} className="searchBarInput" placeholder="Search..." value={search} onChange={(e)=>setSearch(e.target.value)} onSubmit={()=>{onSearch && onSearch()}} onKeyDown={(e)=>{console.log("enter pressed");e.key === 'Enter' && onSearch && onSearch()}}></input>
                <img className="icon" src={searchIcon} alt="Search icon" onClick={()=>onSearch && onSearch()}/>
                {onClose && <img className="close-icon" src={closeIcon} alt="Close icon" onClick={()=>onClose()} />}
            </div>            
          </div>
}

export default SearchBar;