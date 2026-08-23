import { ThreadTree } from './components/thread-tree';
import { useEffect } from 'react';
import { mobileStartup } from '@/services/telemetry/mobile-startup';

const HomeScreen = () => {
    useEffect(() => {
        mobileStartup.succeed('navigation.mount');
    }, []);

    return <ThreadTree />;
};

mobileStartup.begin('navigation.mount');

export default HomeScreen;
