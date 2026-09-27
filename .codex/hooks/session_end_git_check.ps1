$ErrorActionPreference = 'Stop'

function Invoke-GitText {
    param([string[]]$Arguments)

    $output = & git @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ($output -join [Environment]::NewLine)
    }

    return ($output -join [Environment]::NewLine).Trim()
}

try {
    $repoRoot = Invoke-GitText @('rev-parse', '--show-toplevel')
    Set-Location -LiteralPath $repoRoot

    $status = @(git status --porcelain)
    $branch = Invoke-GitText @('branch', '--show-current')
    $remote = (& git config --get "branch.$branch.remote" | Out-String).Trim()
    $mergeRef = (& git config --get "branch.$branch.merge" | Out-String).Trim()
    $upstream = if ($remote -and $mergeRef) {
        $mergeName = $mergeRef -replace '^refs/heads/', ''
        "$remote/$mergeName"
    } else {
        ''
    }

    $ahead = 0
    $behind = 0
    if ($upstream) {
        $counts = (git rev-list --left-right --count "$upstream...HEAD" | Out-String).Trim() -split '\s+'
        if ($counts.Count -eq 2) {
            $behind = [int]$counts[0]
            $ahead = [int]$counts[1]
        }
    }

    if ($status.Count -eq 0 -and $upstream -and $ahead -eq 0 -and $behind -eq 0) {
        Write-Output "Git session check passed: $branch is clean and up to date."
        exit 0
    }

    Write-Output "Git session check requires attention for '$branch':"
    if ($status.Count -gt 0) {
        Write-Output "- $($status.Count) working-tree change(s) are not committed."
        $status | ForEach-Object { Write-Output "  $_" }
    }
    if (-not $upstream) {
        Write-Output "- No upstream branch is configured; the branch cannot be checked for push status."
    } else {
        if ($ahead -gt 0) { Write-Output "- $ahead commit(s) are ahead of $upstream and need push review." }
        if ($behind -gt 0) { Write-Output "- $behind commit(s) are behind $upstream; pull/reconcile before pushing." }
    }
    Write-Output "Review, test, commit, and push intentionally after checking the diff."
    exit 1
}
catch {
    Write-Output "Git session check could not complete: $($_.Exception.Message)"
    exit 1
}
