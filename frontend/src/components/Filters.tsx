import {useState} from 'react';
import type {EventideFilters} from '../interfaces/interfaces';
import {ORDER_BY, CATEGORIES} from '../interfaces/constants'
type props = {
    filters: EventideFilters,
    setFilters: Function
}

// categories: string[],
// date: [Date | null, Date | null], //tuple of form [datestart, dateend]
// order: string[], //order by: datetime, distance, popularity, cost
// cost: [number, number], //tuple of form [mincost, maxcost]
// location: string, //either "", "online" or "inperson"
// host: string, //either "username" or ""
//expanded, columned filters
function Filters({filters, setFilters}: props) {
    const [tagsDropdown, setTagsDropdown] = useState(false);
    const [tagInput, setTagInput] = useState("");
    return <div className="filterModule"> 
              <div key="order" className="row"><p>order by</p><select value={filters.order} onChange={(e)=>setFilters({...filters, order: e.target.value})}>{ORDER_BY.map((option) => (<option value={option}>{option}</option>))}</select></div>
              <div key="cost" className="row"><p>cost</p><input/><p>to</p><input/></div>
              <div key="date" className="row"><p>date</p><input/><p>to</p><input/></div>
              <div key="categories" className="column">
                <p>tags</p>
                <input value={tagInput} onFocus={()=>setTagsDropdown(true)} onChange={(e)=>setTagInput(e.target.value)}/>
                <div className="multiselect">
                    {tagsDropdown && <div id="checkboxes" className="dropdownContent">
                        {CATEGORIES.map((tag)=> (
                        <label htmlFor={tag}>
                            <input type="checkbox" id={tag} value={tag} onChange={(e)=>{const new_filters = new Set(filters.categories); if (e.target.checked){new_filters.add(tag);}else{new_filters.delete(tag)} setFilters({...filters, categories: new_filters})}} />
                            {tag}
                        </label>
                        ))}                        
                    </div>}
                </div>
                <div className="row">
                    {Array.from(filters.categories).map((tag)=><div className='tag'>{tag}</div>)}
                </div>
            </div>
              <div key="location" className="row"><p>location</p><input/></div>
              <div key="host" className="row"><p>host</p><input/></div>
            </div>
}
//short form filters, all fit under search bar. only contain order by, tags, and cost
export function FilterRow({filters, setFilters}: props) {
    return <div className="row filtersRow">
        <div className="row" style={{gap: "10px"}}>
            <p>order by</p>
            <select value={filters.order}>
                {ORDER_BY.map((option) => (<option value={option}>{option}</option>))}
            </select>
        </div>
        <div className="row" style={{gap: "10px"}}>
            <p>tags</p>
            <select multiple value={filters.categories}>
                {ORDER_BY.map((option) => (<option value={option}>{option}</option>))}
            </select>
        </div>
        <div className="row" style={{gap: "10px"}}>
            <p>cost</p>
            <input/>
            <p>to</p>
            <input/>
        </div>
    </div>
}

export default Filters;