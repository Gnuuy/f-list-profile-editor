import React from 'react'
import Footer from './components/Footer';
import Header from './components/Header';
import Main from './components/Main';
import NavBar from './components/NavBar';
import SideBar from './components/SideBar';
import MainRoutes from '../routes/MainRoutes';
import SidebarRoutes from '../routes/SidebarRoutes';
import { ThemeProvider } from '../context/ThemeContext';
import { useRoute } from 'wouter';
import { EditorEngineProvider } from '../context/EditorEngineContext';
import { EditorUIProvider } from '../context/EditorUIContext';

const MemoHeader  = React.memo(Header)
const MemoNavBar  = React.memo(NavBar)
const MemoFooter  = React.memo(Footer)
const MemoSideBar = React.memo(SideBar)
const MemoMain    = React.memo(Main)

export default function PageLayout()
{
  const [isEditor] = useRoute("/")

  const grid = (
    <>
      <MemoSideBar>
        <SidebarRoutes />
      </MemoSideBar>
      <MemoMain>
        <MainRoutes />
      </MemoMain>
    </>
  )

    return (
            <div className="layout-main">
                <MemoHeader />
                <ThemeProvider>
                    <MemoNavBar />
                </ThemeProvider>
                  <div className="layout-grid">
                      { isEditor ? (
                        <EditorEngineProvider>
                          <EditorUIProvider>
                            {grid}
                          </EditorUIProvider>
                        </EditorEngineProvider>
                      ) : (
                        grid
                      )}
                  </div>

                <MemoFooter />
            </div>
    )
}