import HomePage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import MapPage from '../pages/map/map-page';
import AddStoryPage from '../pages/add-story/add-story-page';
import FavoritePage from '../pages/favorite/favorite-page';
import NotFoundPage from '../pages/not-found-page'; // <-- Baris ini yang penting

const routes = {
  '/': HomePage,
  '/home': HomePage,
  '/about': AboutPage,
  '/map': MapPage,
  '/add-story': AddStoryPage,
  '/favorite': FavoritePage,
  '/notFound': NotFoundPage,
};

export default routes;