import { Route, Switch} from 'wouter'
import FaqMainView from '../pages/faq/MainView'
import EditorView from '../pages/editor/EditorView'


export default function MainRoutes() {
    return (
        <Switch>
            <Route path="/" component={EditorView} />
            <Route path="/faq" component={FaqMainView} />
        </Switch>
    )
}