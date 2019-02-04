import React from 'react';
import './header.css';

const header = (props) => {
    const logoUrl = require('../../assets/icons/logo.svg');

    return (
        <div className='header' >
        <a className='link' id='dashboardLink' href={props.dashboardUrl}>&#60; Revenir au tableau de bord</a>
        <div className='headerContainer'>
                <img src={logoUrl} id='logo' alt='logo' />
                <h1 className='brand'>COURS MASSON</h1>
            <h2 className='title'>
                Tableau blanc interactif pour cours particuliers
            </h2>
            <p className='paragraph'>
                Les tableaux blancs interactifs intègrent une fonctionalité de visio-conférence. 
                Ils sont conçus pour fournir une expérience pédagogique optimal pour donner un cours particulier en ligne.  
            </p>

            <button className='btn ctaBtn' onClick={props.create} >Créer un tableau blanc</button>
            <p className='subtitle'>Les tableaux blancs ont une durée de vie 24 heures</p>
            </div>
        </div>
    );
}

export default header;