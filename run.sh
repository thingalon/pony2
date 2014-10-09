#!/bin/bash

scss -v > /dev/null 2>&1 || { echo >&2 "Please install sass with 'gem install sass'."; exit 1; }
cat app/ui/style/*.scss | scss > app/ui/style/main.css && ./Atom.app/Contents/MacOS/Atom --dev app/
