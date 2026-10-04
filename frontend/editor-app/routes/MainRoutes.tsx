import { Route, Switch} from 'wouter'
import FaqMainView from '../pages/faq/MainView'
import EditorView from '../pages/editor/EditorView'
import ProfilesMainView from '../pages/profiles/MainView'
import ImageConverterMainView from '../pages/image-converter/MainView'
import NalasBarsMainView from '../pages/nalas-bars/MainView'


export default function MainRoutes() {
    return (
        <Switch>
            <Route path="/" component={EditorView} />
            <Route path="/faq" component={FaqMainView} />
            <Route path="/profiles" component={ProfilesMainView} />
            <Route path="/image-converter" component={ImageConverterMainView} />
            <Route path="/nalas-bars" component={NalasBarsMainView} />
        </Switch>
    )
}