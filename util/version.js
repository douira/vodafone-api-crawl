import * as pkg from "../package"
import { execSync } from "child_process"

//gets the version string from git and the package version sync
export default dev => {
  //get the current commit short hash
  const headShortHash = execSync("git rev-parse --short HEAD")
    .toString()
    .trim()

  //get the number of commits that lead to the current state
  const headCommitCount = execSync("git rev-list HEAD --count")
    .toString()
    .trim()

  //get branch name
  let branchName = execSync("git --no-pager branch").toString()

  //parse the branch name
  branchName = /\* (.+)/gm.exec(branchName)[1]

  //get the package version
  const packageVersion = pkg.version

  //the package repo url
  let packageRepoUrl = "https://github.com/douira/nuxt-spa-template"

  //if given in the package
  if (pkg.repository && pkg.repository.type === "git" && pkg.repository.url) {
    //sanitize and use
    packageRepoUrl = pkg.repository.url.toString().replace(/\.git.*/, "")
  }

  //return formatted version string and other info
  return {
    formatted: `${branchName}@${packageVersion}-${
      dev ? "dev" : "prod"
    } (#${headCommitCount}:${headShortHash})`,
    branchName,
    packageVersion,
    headCommitCount,
    headShortHash,
    packageRepoUrl,

    //generate a commit url to the page of the commit in the github repo
    commitUrl: `${packageRepoUrl}/commit/${headShortHash}`
  }
}
