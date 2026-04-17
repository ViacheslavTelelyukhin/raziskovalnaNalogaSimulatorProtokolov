let toCancel: any;
let toggle = true
export const notify = (message: string) => {
    const div = document.getElementById('notificationContainer')

    if (toCancel) clearTimeout(toCancel)

    div.innerHTML = message

    if(toggle)
        div.className = 'translateNone'
    
    toggle = false
    toCancel = setTimeout(() => {
        div.className = 'translateHide'
        toggle = true
        toCancel = setTimeout(() => {
            div.innerHTML = ''
        }, 1100)
    }, 7000)
}