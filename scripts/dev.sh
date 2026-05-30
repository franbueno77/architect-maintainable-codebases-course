pnpm dlx concurrently -n "Server,Models,Client" \ 
                       -c "yellow,blue" \
                        "pnpm --filter=server run dev" \
                        "pnpm --filter=models run dev" \
                        "pnpm --filter=ui run dev" \