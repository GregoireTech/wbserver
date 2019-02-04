import React from 'react';
import {Link} from 'react-router-dom';

import './table.css';

const table = (props) => {
    let list = props.boardList;
    // Setup criterias for sorting the boards in chronological order
    function compare (a, b){
        if (a.date > b.date){
            return -1;
        } else if (a.date < b.date){
            return 1;
        } else if(a.date === b.date){
            if (a.time >= b.time){
                return -1;
            } else {
                return 1;
            }
        }
    }
    // Sort boards according to criterias above
    list.sort(compare);

    let tableItems;
        if (list !== [] && list.length >= 1){
            
            tableItems = list.map((board, index) => {
                const itemText = `Tableau blanc créé le ${board.date} à ${board.time}`;
                return (
                    <div className="tableItem" key={index} >
                        <p className='roomName'>{itemText}
                            <Link to={`/boards/?${board.string}`} >
                                <span className='link joinLink'>Rejoindre</span>
                            </Link>
                        </p>
                    </div>
                );
            });
        } else {
            tableItems = (<div className="room">Il n'y a pas encore de rooms, cliquez sur le bouton ci-dessus pour en créer une.</div> );
        }
    return (
        <div className='table'>
            {tableItems}
        </div>
    );
}

export default table;