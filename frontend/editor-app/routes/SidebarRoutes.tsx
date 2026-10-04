import { Route, Switch} from 'wouter'
import EditorSidebarView from '../pages/editor/SidebarView'
import FaqSidebarView from '../pages/faq/SidebarView'
import ProfilesSidebarView from '../pages/profiles/SidebarView'
import ImageConverterSidebarView from '../pages/image-converter/SidebarView'
import NalasBarsSidebarView from '../pages/nalas-bars/SidebarView'

export default function SidebarRoutes() {
    return (
        <Switch>
            <Route path="/" component={EditorSidebarView} />
            <Route path="/faq" component={FaqSidebarView} />
            <Route path="/profiles" component={ProfilesSidebarView} />
            <Route path="/image-converter" component={ImageConverterSidebarView} />
            <Route path="/nalas-bars" component={NalasBarsSidebarView} />
        </Switch>
    )
}