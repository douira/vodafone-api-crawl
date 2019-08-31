import colors from "vuetify/es5/util/colors"

export default {
  //treeShake is set in production
  theme: {
    dark: true,
    themes: {
      //set the theme colors
      dark: {
        primary: colors.lightBlue,
        secondary: colors.blue,
        accent: colors.teal,
        info: colors.cyan,
        warning: colors.orange,
        error: colors.red,
        success: colors.green
      },
      light: {
        primary: colors.blue,
        secondary: colors.lightBlue,
        accent: colors.teal,
        info: colors.cyan,
        warning: colors.orange,
        error: colors.red,
        success: colors.green
      }
    }

    //theme cache and minify theme are not necessary in SPA apps like this one
  }
}
