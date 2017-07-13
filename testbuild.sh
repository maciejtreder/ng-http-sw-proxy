git push build --delete newBuild
git commit -m "new build" .
npm run build

git cob newBuild
mv .gitignore ._gitignore
cat .npmignore >> .gitignore
git add .
git commit -m "new build" .
git push build
git co master
git b -D newBuild
mv ._gitignore .gitignore