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
    return <div className="column small-gap"> 
              <div key="order" className="row small-gap"><p>order by</p><select value={filters.order} onChange={(e)=>setFilters({...filters, order: e.target.value})}>{ORDER_BY.map((option) => (<option value={option}>{option}</option>))}</select></div>
              <div key="cost" className="row small-gap"><p>cost: </p><label htmlFor="startCost">$<input id="startCost" size={1} type='number' style={{width: "20px"}}/></label><p>to </p><label htmlFor="endCost">$<input size={1} type='number' id="endCost" style={{width: "20px"}}/></label></div>
              <div key="date" className="row small-gap"><p>date</p><input type="date"/><p>to</p><input type="date"/></div>
              <div key="categories" onBlur={()=>setTagsDropdown(false)} className="column">
                <div className="row small-gap" style={{position: "relative"}}>
                    <p>tags</p>
                    <input value={tagInput} onFocus={()=>setTagsDropdown(true)} onChange={(e)=>setTagInput(e.target.value)} onKeyDown={(e)=>{const new_filters = new Set(filters.categories); if(e.key == "Enter" && tagInput){new_filters.add(tagInput); setFilters({...filters, categories: new_filters}); setTagsDropdown(false); setTagInput("")}}}/>
                    <div className="multiselect" style={{position: "absolute", top: "25px", left: "35px", width: '90%'}}>
                        {tagsDropdown && <div id="checkboxes" className="dropdownContent">
                            {CATEGORIES.map((tag)=> (
                            <label htmlFor={tag}>
                                <input type="checkbox" id={tag} value={tag} onChange={(e)=>{const new_filters = new Set(filters.categories); if (e.target.checked){new_filters.add(tag);}else{new_filters.delete(tag)} setFilters({...filters, categories: new_filters})}} />
                                {tag}
                            </label>
                            ))}                        
                        </div>}
                    </div>
                </div>
                
                <div className="row small-gap">
                    {Array.from(filters.categories).map((tag)=><div className='tag'>#{tag}</div>)}
                </div>
            </div>
              <div key="location" className="row small-gap"><p>location</p><input/></div>
              <div key="host" className="row small-gap"><p>host</p><input/></div>
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
            <select value={filters.order}>
                {ORDER_BY.map((option) => (<option value={option}>{option}</option>))}
            </select>
        </div>
        <div className="row" style={{gap: "10px"}}>
            <p>cost</p>
            <input style={{width: "20px"}}/>
            <p>to</p>
            <input style={{width: "20px"}}/>
        </div>
    </div>
}

export default Filters;