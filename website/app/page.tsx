import { AppCarousel } from '@/components/AppCarousel';
import { Download } from '@/components/Download';
import { Nav } from '@/components/Nav';
import { Preloader } from '@/components/Preloader';
import { Specs } from '@/components/Specs';
import { Story } from '@/components/Story';

export default function Home() {
  return (
    <>
      <Preloader />
      <Nav />
      <main id="top">
        <Story />
        <AppCarousel />
        <Specs />
        <Download />
      </main>
    </>
  );
}
