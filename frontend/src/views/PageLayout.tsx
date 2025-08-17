import React from 'react'
import Footer from './components/Footer';
import Header from './components/Header';
import Main from './components/Main';
import NavBar from './components/NavBar';
import SideBar from './components/SideBar';
import MainRoutes from '../routes/MainRoutes';
import SidebarRoutes from '../routes/SidebarRoutes';
import { ThemeProvider } from '../context/ThemeContext';

const MemoHeader  = React.memo(Header)
const MemoNavBar  = React.memo(NavBar)
const MemoFooter  = React.memo(Footer)
const MemoSideBar = React.memo(SideBar)
const MemoMain    = React.memo(Main)

export default function PageLayout()
{
    return (
            <div className="LayoutMain">
                <MemoHeader />
                <ThemeProvider>
                    <MemoNavBar />
                </ThemeProvider>
                  <div className="layoutGrid">
                      <MemoSideBar>
                        <SidebarRoutes />
                      </MemoSideBar>
                      <MemoMain>
                        <MainRoutes />
                      </MemoMain>
                  </div>
                <MemoFooter />
            </div>
    )
}