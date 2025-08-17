import { Route, Switch} from 'wouter'
import EditorMainView from '../pages/editor/MainView'
import FaqMainView from '../pages/faq/MainView'

export default function MainRoutes() {
    return (
        <Switch>
            <Route path="/" component={EditorMainView} />
            <Route path="/faq" component={FaqMainView} />
        </Switch>
    )
}