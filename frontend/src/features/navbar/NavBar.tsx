import React from 'react';
import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

import SessionUserMenu from './SessionUserMenu'
import SearchBox from '../search/SearchBox'
import QriLogo from '../../chrome/QriLogo'
import ButtonGroup from '../../chrome/ButtonGroup'
import { selectNavExpanded } from '../app/state/appState'

export interface NavBarProps {
  minimal?: boolean
}

const NavBar: React.FC<NavBarProps> = ({ minimal = false }) => {
  const expanded = useSelector(selectNavExpanded)
  const location = useLocation()

  const buttonItems = [
    { text: 'Dashboard', link: '/dashboard', icon: 'dashboard'},
    { text: 'My Datasets', link: '/collection', icon: 'myDatasets'}
  ]

  return (
    <div className='bg-white text-qrinavy-700 text-bold flex items-center pr-8' style={{
      height: '110px',
      paddingTop: '30px',
      paddingBottom: '30px',
    }}>
      <Link className='mr-5' to='/'>
        <div className={`flex align-center items-center justify-center ${expanded ? 'w-52' : 'w-24'}`}>
          <QriLogo />
          <div className={`font-medium text-2xl ml-2 ${expanded ? 'block' : 'hidden'}`}>Qri</div>
        </div>
      </Link>
      {!minimal && <SearchBox />}
      <div className='flex m-auto items-center'>
        {!minimal && (
          <ButtonGroup
            items={buttonItems}
            selectedIndex={buttonItems.findIndex((d) => location.pathname === d.link)}
          />
        )}
      </div>
      <SessionUserMenu />
    </div>
  )
}

export default NavBar
