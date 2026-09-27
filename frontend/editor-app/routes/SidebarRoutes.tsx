import { Route, Switch} from 'wouter'
import EditorSidebarView from '../pages/editor/SidebarView'
import FaqSidebarView from '../pages/faq/SidebarView'
import ProfilesSidebarView from '../pages/profiles/SidebarView'

export default function SidebarRoutes() {
    return (
        <Switch>
            <Route path="/" component={EditorSidebarView} />
            <Route path="/faq" component={FaqSidebarView} />
            <Route path="/profiles" component={ProfilesSidebarView} />
        </Switch>
    )
}