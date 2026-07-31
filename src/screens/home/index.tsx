import { ThreadTree } from './components/thread-tree';
import { useHideAppSplash } from '@/services/app-splash';

const HomeScreen = () => {
    useHideAppSplash();

    return <ThreadTree />;
};

export default HomeScreen;
