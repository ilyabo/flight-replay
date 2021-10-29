import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
  cssVarPrefix: 'fr',
};
const theme = extendTheme({
  config,
  colors: {
    overlayBg: 'rgba(50,50,60,0.5)',
  },
});
export default theme;
