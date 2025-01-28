import Footer from '../components/Footer';
import Header from '../components/Header';
import MainView from '../components/MainView';
import NavBar from '../components/NavBar';
import SideBar from '../components/SideBar';

interface ViewProps
{
    mainBarChildren: React.ReactNode;
    sideBarChildren: React.ReactNode;
}

export default function PageLayout({sideBarChildren, mainBarChildren}: ViewProps)
{
    return (
            <div className="LayoutMain">
                <Header />
                <NavBar />
                  <div className="layoutGrid">
                    <SideBar>
                            {sideBarChildren}
                    </SideBar>
                    <MainView>
                            {mainBarChildren}
                    </MainView>
                  </div>
                <Footer />
            </div>
    )
}