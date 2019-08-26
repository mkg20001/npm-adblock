# npm-adblock

A simple module that patches npm to not run some postinstall hooks used to display ads

# How does it work?

After being installed globally, this module's postinstall script will patch the nodeJS files in such a way that:
 - When npm gets updated, it gets repatched
 - When a module tries to run a postinstall hook for ads, it will silently print it to the debug log

# Usage

Simply install it globally using `npm i -g npm-adblock`

You can re-run it at any time using `adblock-patch`

When you don't notice it, it's working! :)

Otherwise, feel free to [open an issue](https://github.com/mkg20001/npm-adblock/issues)
